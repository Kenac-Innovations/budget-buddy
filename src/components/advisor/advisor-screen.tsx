"use client";
import { startTransition,useCallback,useEffect,useMemo,useRef,useState,type ReactNode } from "react";
import { z } from "zod";
import { ArrowUp,ChevronUp,LockKeyhole,Moon,ShieldCheck,Square,Sun,Wallet,X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OPENING_MESSAGE } from "@/lib/advisor/events";
import { applyOp,type PlanOp } from "@/lib/plan/ops";
import { emptyPlan,Plan } from "@/lib/plan/types";
import { cn } from "@/lib/utils";
import { LightMarkdown } from "./markdown";
import { PlanView,planSummary } from "./plan-view";
import { loadSession,PlanConflict,requestTurn,sendUserOp } from "./transport";
import { SaveForm } from "./save-form";
import { SavedSharePanel } from "./share-panel";
import { WrapUpCard } from "./wrap-up-card";
import { resetDemoSession } from "./demo-session";
import styles from "./styles";
import "./advisor.css";
const Message=z.object({ id: z.string(),role: z.enum(["user","advisor"]),text: z.string().max(20000),summary: z.string().max(600).optional(),offerSave: z.boolean().optional() });
type Message=z.infer<typeof Message>;
const Draft=z.object({ expires: z.number(),plan: Plan,messages: z.array(Message).max(200),turn: z.number().int().nonnegative() });
const OPENING: Message={ id: "opening",role: "advisor",text: OPENING_MESSAGE };
// Next dispatches server mutations within a transition, including calls made while bootstrapping.
function resetDemo() {
  return new Promise<boolean>(resolve => startTransition(async () => {
    try { resolve(await resetDemoSession()); } catch { resolve(false); }
  }));
}
/** Integration seam: T3's return page can supply a validated plan, history and save form. */
export function AdvisorScreen({ demo=false,initialPlan,initialMessages,saved=false,saveForm }: {
  demo?: boolean;
  initialPlan?: Plan;
  initialMessages?: Message[];
  saved?: boolean;
  saveForm?: ReactNode;
}) {
  const [demoMode,setDemoMode]=useState(demo);
  const [plan,setPlan]=useState<Plan>(initialPlan??emptyPlan);
  const planRef=useRef(plan);
  const [messages,setMessages]=useState<Message[]>(initialMessages?.length? initialMessages:[OPENING]);
  const [input,setInput]=useState("");
  const [streaming,setStreaming]=useState(false);
  const [pendingOp,setPendingOp]=useState(false);
  const [replyId,setReplyId]=useState("");
  const [status,setStatus]=useState("thinking");
  const [failure,setFailure]=useState(false);
  const [stopped,setStopped]=useState(false);
  const [opError,setOpError]=useState("");
  const [sheet,setSheet]=useState(false);
  const [changed,setChanged]=useState<Record<string,number>>({});
  const [sessionSaved,setSessionSaved]=useState(saved);
  const [sharing,setSharing]=useState(false);
  const sessionRequest=useRef<ReturnType<typeof loadSession>|null>(null);
  const [ready,setReady]=useState(false);
  const [booting,setBooting]=useState(true);
  const [turn,setTurn]=useState(0);
  const abortRef=useRef<AbortController|null>(null);
  const activeRef=useRef(false);
  const retry=useRef({ message: "",replyId: "" });
  const viewport=useRef<HTMLDivElement>(null);
  const follow=useRef(true);
  const textarea=useRef<HTMLTextAreaElement>(null);
  const panel=useRef<HTMLElement>(null);
  const openButton=useRef<HTMLButtonElement>(null);
  const summary=useMemo(() => planSummary(plan),[plan]);
  const draftKey=demoMode? "bb-draft-demo":"bb-draft";
  const replacePlan=(next: Plan) => { planRef.current=next; setPlan(next); };
  useEffect(() => {
    const controller=new AbortController();
    const frame=requestAnimationFrame(async () => {
      const mode=demo;
      setDemoMode(mode);
      const notice=new URLSearchParams(location.search).get("notice");
      if(notice==="link-expired") setOpError("That link has expired. You can start a new conversation.");
      if(notice==="resume-unavailable") setOpError("We couldn't open your plan. Try the link again in a moment.");
      const storageKey=mode? "bb-draft-demo":"bb-draft";
      let hasDraft=false;
      if(!initialPlan&&!saved) {
        try {
          const raw=localStorage.getItem(storageKey);
          const stored=raw? Draft.safeParse(JSON.parse(raw)):null;
          if(stored?.success&&stored.data.expires>Date.now()) {
            hasDraft=true;
            planRef.current=stored.data.plan;
            setPlan(stored.data.plan);
            setMessages(stored.data.messages);
            setTurn(stored.data.turn);
          }
          else if(raw)
            localStorage.removeItem(storageKey);
        }
        catch { /* A blocked browser store must not block the conversation. */ }
      }
      try {
        if(!initialPlan) {
          sessionRequest.current ??= (async () => {
            if(mode&&!hasDraft) {
              if(!await resetDemo()) throw new Error("Demo reset unavailable");
              return null;
            }
            return loadSession(new AbortController().signal);
          })();
          const session=await sessionRequest.current;
          if(controller.signal.aborted) return;
          if(session) {
            planRef.current=session.plan;
            setPlan(session.plan);
            setSessionSaved(session.saved);
            const history: Message[]=session.messages.map((m,i) => ({ id: `resumed-${i}`,role: m.role==="assistant"? "advisor":"user",text: m.content }));
            setMessages(history.length? [mode? OPENING:{ id: "welcome",role: "advisor",text: "Welcome back. Your plan and the decisions we made are here." },...history]:[OPENING]);
            setTurn(session.messages.filter(m => m.role==="assistant").length);
          }
          else if(mode) {
            planRef.current=emptyPlan();
            setPlan(planRef.current);
            setMessages([OPENING]);
            setTurn(0);
            try { localStorage.removeItem(storageKey); } catch { }
          }
        }
      }
      catch {
        if(!controller.signal.aborted) {
          setOpError(mode? "The demo could not be reset. Select Start over to try again.":"Your saved session could not be loaded. Refresh to try again.");
          setBooting(false);
          if(mode) return;
        }
      }
      if(!controller.signal.aborted) {
        setReady(true);
        setBooting(false);
      }
    });
    return () => { controller.abort(); cancelAnimationFrame(frame); abortRef.current?.abort(); };
  },[demo,initialPlan,saved]);
  useEffect(() => {
    if(!ready||sessionSaved||saved||streaming||pendingOp||messages.length===1)
      return;
    try {
      localStorage.setItem(draftKey,JSON.stringify({ plan,messages,turn,expires: Date.now()+30*86400000 }));
    }
    catch { }
  },[draftKey,ready,sessionSaved,saved,streaming,pendingOp,messages,plan,turn]);
  useEffect(() => {
    if(viewport.current&&follow.current)
      viewport.current.scrollTop=viewport.current.scrollHeight;
  },[messages,status,failure,stopped]);
  useEffect(() => {
    const element=viewport.current;
    if(!element)
      return;
    const observer=new ResizeObserver(() => {
      if(follow.current)
        element.scrollTop=element.scrollHeight;
    });
    observer.observe(element);
    return () => observer.disconnect();
  },[]);
  useEffect(() => {
    if(!textarea.current)
      return;
    textarea.current.style.height="auto";
    textarea.current.style.height=`${Math.min(160,textarea.current.scrollHeight)}px`;
  },[input]);
  useEffect(() => {
    if(!sheet)
      return;
    const element=panel.current;
    const trigger=openButton.current;
    const focusables=() => Array.from(element?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, textarea, [tabindex="0"]')??[]).filter(e => e.getClientRects().length>0);
    focusables()[0]?.focus();
    const keydown=(e: KeyboardEvent) => {
      if(e.key==="Escape") {
        e.preventDefault();
        setSheet(false);
      }
      if(e.key==="Tab") {
        const items=focusables();
        const first=items[0];
        const last=items[items.length-1];
        if(e.shiftKey&&document.activeElement===first) {
          e.preventDefault();
          last?.focus();
        }
        else if(!e.shiftKey&&document.activeElement===last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    const resize=() => {
      if(window.innerWidth>=900)
        setSheet(false);
    };
    document.addEventListener("keydown",keydown);
    window.addEventListener("resize",resize);
    return () => { document.removeEventListener("keydown",keydown); window.removeEventListener("resize",resize); trigger?.focus(); };
  },[sheet]);
  async function send(message: string,isRetry=false) {
    if(!ready||activeRef.current||pendingOp||!message.trim())
      return;
    activeRef.current=true;
    const controller=new AbortController();
    abortRef.current=controller;
    const id=isRetry? retry.current.replyId:crypto.randomUUID();
    if(!isRetry) {
      retry.current={ message,replyId: id };
      setMessages(current => [...current,{ id: crypto.randomUUID(),role: "user",text: message },{ id,role: "advisor",text: "" }]);
      setInput("");
    }
    else
      setMessages(current => current.map(m => m.id===id? { ...m,text: "",summary: undefined }:m));
    setReplyId(id);
    setStreaming(true);
    setFailure(false);
    setStopped(false);
    setStatus("thinking");
    setOpError("");
    follow.current=true;
    let completed=false;
    try {
      for await(const event of requestTurn(message,controller.signal,demoMode)) {
        controller.signal.throwIfAborted();
        switch(event.type) {
          case "status":
            setStatus(event.status);
            break;
          case "text":
            setMessages(current => current.map(m => m.id===id? { ...m,text: m.text+event.delta }:m));
            break;
          case "op": {
            // A retry may replay operations already shown before the connection failed.
            if(event.version<=planRef.current.version)
              break;
            const result=applyOp(planRef.current,event.op,"advisor");
            if(!result.ok||result.plan.version!==event.version||(event.createdId&&result.createdId!==event.createdId))
              throw new Error("Plan stream out of sync");
            replacePlan(result.plan);
            const changedId=result.createdId??("id" in event.op? event.op.id:"profile");
            setChanged(current => ({ ...current,[changedId]: event.version }));
            requestAnimationFrame(() => {
              const item=panel.current?.querySelector(`[data-plan-id="${changedId}"]`);
              if(item?.getClientRects().length)
                item.scrollIntoView({ block: "nearest",behavior: matchMedia("(prefers-reduced-motion: reduce)").matches? "instant":"smooth" });
            });
            break;
          }
          case "wrap_up":
            setMessages(current => current.map(m => m.id===id? { ...m,summary: event.summary,offerSave: !sessionSaved }:m));
            break;
          case "error": throw new Error("Turn interrupted");
          case "done":
            replacePlan(event.plan);
            completed=true;
            setTurn(current => current+1);
            break;
        }
      }
      if(!completed)
        throw new Error("Incomplete turn");
    }
    catch {
      if(controller.signal.aborted)
        setStopped(true);
      else
        setFailure(true);
    }
    finally {
      activeRef.current=false;
      setStreaming(false);
      abortRef.current=null;
      requestAnimationFrame(() => textarea.current?.focus());
    }
  }
  const userOp=useCallback(async (op: PlanOp): Promise<boolean> => {
    if(activeRef.current||pendingOp)
      return false;
    const before=planRef.current;
    const result=applyOp(before,op,"user");
    if(!result.ok) {
      setOpError("This change could not be applied. Review the line and try again.");
      return false;
    }
    activeRef.current=true;
    setPendingOp(true);
    setOpError("");
    replacePlan(result.plan);
    const controller=new AbortController();
    abortRef.current=controller;
    try {
      const authoritative=await sendUserOp(op,controller.signal);
      if(authoritative)
        replacePlan(authoritative);
      if("id" in op)
        setChanged(current => ({ ...current,[op.id]: result.plan.version }));
      return true;
    }
    catch(error) {
      replacePlan(error instanceof PlanConflict&&error.plan? error.plan:before);
      setOpError(error instanceof PlanConflict? "Your plan changed in another window. Review it and try again.":"Your change was not saved. Try again.");
      return false;
    }
    finally {
      activeRef.current=false;
      setPendingOp(false);
      abortRef.current=null;
    }
  },[pendingOp]);
  async function startOver() {
    if(!demoMode||booting||activeRef.current||pendingOp) return;
    activeRef.current=true;
    setPendingOp(true);
    try {
      if(!await resetDemo()) throw new Error("Reset unavailable");
      try { localStorage.removeItem("bb-draft-demo"); } catch { }
      replacePlan(emptyPlan());
      setMessages([OPENING]);
      setTurn(0);
      setInput("");
      setChanged({});
      setReplyId("");
      setFailure(false);
      setStopped(false);
      setSessionSaved(false);
      setSharing(false);
      setOpError("");
      retry.current={ message: "",replyId: "" };
      sessionRequest.current=null;
      follow.current=true;
      setReady(true);
      requestAnimationFrame(() => textarea.current?.focus());
    } catch {
      setOpError("The demo could not be reset. Select Start over to try again.");
    } finally {
      activeRef.current=false;
      setPendingOp(false);
    }
  }
  return <div className={styles.screen}>
    <header className={styles.topbar} inert={sheet||undefined}>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-[7px] bg-nav-primary text-nav-primary-fg">
          <Wallet size={16} strokeWidth={1.7} />
        </span>
        <div>
          <p className="text-wordmark text-brand">Budget Buddy</p>
          <p className="mt-0.5 text-[11px] font-medium text-ink-2">by Kenac Computer Systems</p>
        </div>
      </div>
      <span className={styles.sessionState}>
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
        {saved||sessionSaved? "Saved":"Not saved yet"}
      </span>
      <Button variant="ghost" size="icon" className="ml-auto" title="Switch theme · Dark: HUD mode" aria-label="Switch light or dark theme · Dark: HUD mode" onClick={() => {
        const dark=document.documentElement.classList.toggle("hf-theme-dark"); try {
          localStorage.setItem("bb-theme",dark? "dark":"light");
        }
          catch { }
      }}>
        <Moon className="dark:hidden" />
        <Sun className="hidden dark:block" />
      </Button>
    </header>
    <main className={styles.workspace}>
      <section className={styles.conversation} aria-label="Conversation with Budget Buddy" inert={sheet||undefined}>
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-4 nav:px-8">
          <div><p className="text-caption font-semibold text-ink-2">Your 2027 ICT plan</p>
            {demoMode&&<div className="bb-advisor-demo-controls"><p>Demo · Scripted planning assumptions</p><button type="button" disabled={booting||streaming||pendingOp} onClick={startOver}>Start over</button></div>}</div>
          <span className="flex items-center gap-1.5 text-caption text-ink-2"><LockKeyhole size={12} />Private conversation</span>
        </div>
        <div ref={viewport} className={styles.messages} onScroll={() => {
          const el=viewport.current; if(el)
            follow.current=el.scrollHeight-el.scrollTop-el.clientHeight<100;
        }}>
          <div className="mx-auto w-full max-w-[600px] space-y-7">
            {messages.map(m => <article key={m.id} className={m.role==="user"? styles.userMessage:styles.advisorMessage} data-streaming={m.role==="advisor"&&streaming&&m.id===replyId} aria-label={m.role==="user"? "You":"Budget Buddy"}>
              {m.role==="advisor"&&<p className="mb-3 flex items-center gap-2 text-caption font-semibold text-brand"><span className="size-1.5 rounded-full bg-brand" aria-hidden />Budget Buddy</p>}
              <div className={cn("text-[15px] leading-[1.75]",m.role==="user"? "text-ink-2":"text-ink")}>
                <LightMarkdown text={m.text} />
              </div>
              {streaming&&m.id===replyId&&!m.text&&<div className="flex min-h-8 items-center gap-2 text-caption text-ink-2">
                <span className={styles.thinking}>{status==="thinking"? "Thinking it through":status==="planning"? "Shaping your plan":"Putting it into words"}</span>
              </div>}
              {m.summary&&<WrapUpCard summary={m.summary}>{saveForm??(m.offerSave&&m.id===[...messages].reverse().find(item => item.summary)?.id?
                <SaveForm onSaved={() => { setSessionSaved(true); try { localStorage.removeItem(draftKey); } catch { } }} />:undefined)}</WrapUpCard>}
            </article>)}
            {sessionSaved&&<div className="space-y-4">
              <p className="text-sm text-ink-2">Your plan is saved. Sharing with Kenac is your choice.</p>
              <div className="flex flex-wrap gap-3">
                {!messages.some(m => m.offerSave)&&<a href="/api/export/xlsx" download className="text-sm font-medium text-primary underline underline-offset-4">Download Excel file</a>}
                <Button variant="outline" size="sm" onClick={() => setSharing(current => !current)}>{sharing? "Close sharing choices":"Choose items to share"}</Button>
              </div>
              {sharing&&<SavedSharePanel onPlanChange={replacePlan} />}
            </div>}
            {(failure||stopped)&&<div className="rounded-xl border border-line bg-surface-2 p-4" role="alert">
              <p className="text-sm">{failure? "I lost my train of thought. Try again?":"Reply stopped. The items already added are still in your plan."}</p>
              <Button className="mt-2" variant="outline" size="sm" disabled={streaming||pendingOp} onClick={() => send(retry.current.message,true)}>{failure? "Retry":"Resume reply"}</Button>
            </div>}
          </div>
        </div>
        <div className={styles.composerArea}>
          {opError&&<p role="alert" className="mb-2 text-sm text-destructive">{opError}</p>}
          <form className={styles.composer} onSubmit={e => { e.preventDefault(); send(input.trim()); }}>
            <label className="sr-only" htmlFor="advisor-message">Message Budget Buddy</label>
            <textarea ref={textarea} id="advisor-message" rows={1} maxLength={4000} value={input} disabled={streaming||pendingOp||!ready} placeholder="Tell me what the business needs next year…" onChange={e => setInput(e.target.value)} onKeyDown={e => {
              if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing) {
                e.preventDefault();
                if(!streaming)
                  send(input.trim());
              }
            }} className={styles.textarea} />
            {streaming? <Button type="button" size="icon" variant="outline" aria-label="Stop reply" onClick={() => abortRef.current?.abort()}>
              <Square size={14} />
            </Button>:<Button type="submit" size="icon" aria-label="Send message" disabled={!input.trim()||pendingOp||!ready}>
              <ArrowUp />
            </Button>}
          </form>
          <p className="bb-advisor-command-hint">Enter to send <span aria-hidden>·</span> Shift+Enter for a new line</p>
          <p className="mt-2.5 text-center text-[11px] text-ink-2">Take your time. A first draft starts with the big picture.</p>
        </div>
        <button ref={openButton} className={styles.planBar} aria-expanded={sheet} aria-controls="living-plan" onClick={() => setSheet(true)}>
          <span className="min-w-0 text-left">
            <span className="block font-semibold">Your plan · {plan.objectives.filter(o => o.state!=="dismissed").length} objectives</span>
            <span className="block text-caption text-ink-2">{summary.amount} · {summary.unpriced} unpriced</span>
          </span>
          <ChevronUp size={18} className="shrink-0" />
        </button>
      </section>
      {sheet&&<div className={styles.scrim} aria-hidden onClick={() => setSheet(false)} />}
      <aside ref={panel} id="living-plan" className={cn(styles.planPanel,sheet&&styles.openSheet)} role={sheet? "dialog":undefined} aria-modal={sheet||undefined} aria-label="Your living plan">
        <div className={styles.sheetHandle}>
          <span className="font-semibold">Your plan</span>
          <Button variant="ghost" size="icon" aria-label="Close plan" onClick={() => setSheet(false)}>
            <X />
          </Button>
        </div>
        {opError&&<div className="mx-5 mt-4 rounded-lg border border-destructive bg-surface p-3 text-sm text-ink" role="alert">{opError}</div>}
        <PlanView plan={plan} changed={changed} disabled={streaming||pendingOp||!ready} onOp={userOp} />
      </aside>
    </main>
    <footer className={styles.footer} inert={sheet||undefined}>
      <ShieldCheck size={13} aria-hidden />
      <span>AI advisor run by Kenac <span aria-hidden>·</span> Your plan is private <span aria-hidden>·</span> <Link href="/privacy" className="underline underline-offset-4 hover:text-brand">How we handle data</Link></span>
    </footer>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{streaming&&!messages[messages.length-1]?.text? "Budget Buddy is thinking.":messages[messages.length-1]?.role==="advisor"? messages[messages.length-1].text:""}</div>
  </div>;
}
