import type { PaymentScheduleItem } from "./types";

export function calculatePaymentSchedule(valueMinor:bigint,items:Omit<PaymentScheduleItem,"amountMinor">[]):PaymentScheduleItem[]{
 if(valueMinor<0n)throw new Error("Contract value cannot be negative");
 if(items.length===0)throw new Error("Payment schedule is required");
 if(items.reduce((sum,item)=>sum+item.percentageBps,0)!==10000)throw new Error("Payment schedule percentages must equal 100%");
 let allocated=0n;
 return items.map((item,index)=>{const amount=index===items.length-1?valueMinor-allocated:(valueMinor*BigInt(item.percentageBps)+5000n)/10000n;allocated+=amount;return{...item,amountMinor:amount};});
}
export function applyChangeOrder(valueMinor:bigint,impactMinor:bigint){const result=valueMinor+impactMinor;if(result<0n)throw new Error("Change order cannot make contract value negative");return result}
export function formatContractMoney(valueMinor:bigint,currency:string,locale="ar-SA"){const digits=["KWD"].includes(currency)?3:["JPY"].includes(currency)?0:2;return new Intl.NumberFormat(locale,{style:"currency",currency,minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(valueMinor)/10**digits)}
