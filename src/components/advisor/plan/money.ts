import Decimal from "decimal.js";

export function money(amount: Decimal,currency: string) {
  const [whole,fraction]=amount.toFixed(amount.isInteger()? 0:2).split(".");
  return `${currency==="USD"? "US$":`${currency} `}${whole.replace(/\B(?=(\d{3})+(?!\d))/g,",")}${fraction? `.${fraction}`:""}`;
}
