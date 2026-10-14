import { Fragment } from "react";
function Inline({ text }: {
  text: string;
}) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part,i) => part.startsWith("**")&&part.endsWith("**")? <strong key={i}>{part.slice(2,-2)}</strong>:<Fragment key={i}>{part}</Fragment>);
}
/** Deliberately small markdown vocabulary. Model text is never interpreted as HTML. */
export function LightMarkdown({ text }: {
  text: string;
}) {
  return text.split(/\n\n/).map((block,index) => {
    const lines=block.split("\n");
    if(lines.every(line => /^[-*] /.test(line)))
      return <ul key={index} className="my-3 list-disc space-y-1 pl-5">{lines.map((line,i) => <li key={i}>
        <Inline text={line.slice(2)} />
      </li>)}</ul>;
    if(lines.every(line => /^\d+\. /.test(line)))
      return <ol key={index} className="my-3 list-decimal space-y-1 pl-5">{lines.map((line,i) => <li key={i}>
        <Inline text={line.replace(/^\d+\. /,"")} />
      </li>)}</ol>;
    return <p key={index} className="whitespace-pre-wrap [&+p]:mt-4">
      <Inline text={block} />
    </p>;
  });
}
