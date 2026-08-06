type Row = Record<string, unknown>;

const organization = { id:"org-madar-demo", name_ar:"شركة مدار التجريبية", name_en:"Madar Demo Company", status:"active", email:"demo@example.test", phone:"+966500000000", country:"السعودية", city:"جدة", tax_number:null, commercial_registration:null };
const profile = { id:"u-owner", full_name:"عبدالعزيز الجندي", phone:"+966500000000", job_title:"مالك الشركة", department_id:null };
const tables: Record<string, Row[]> = {
  organizations:[organization], profiles:[profile], organization_members:[{id:"member-owner",organization_id:organization.id,user_id:profile.id,status:"active",organizations:organization,profiles:profile}],
  user_roles:[], departments:[{id:"dep-sales",organization_id:organization.id,name_ar:"المبيعات",is_active:true}], invitations:[], audit_logs:[],
  roles:[{id:"role-owner",organization_id:organization.id,name_ar:"المالك",name_en:"Owner",code:"owner",description:"الدور التجريبي",is_system:true,user_roles:[{count:1}]}],
  permissions:[], lead_stages:[], lead_sources:[], crm_tags:[], leads:[], customer_accounts:[], contacts:[], crm_interactions:[], lead_tags:[], customer_tags:[], contact_tags:[]
};

class LocalQuery {
  private rows: Row[]; private countOnly=false; private singleRow=false;
  constructor(private table:string){this.rows=structuredClone(tables[table]??[]);}
  select(_columns?:string,options?:{count?:string;head?:boolean}){this.countOnly=Boolean(options?.head);return this;}
  eq(field:string,value:unknown){this.rows=this.rows.filter((r)=>r[field]===value);return this;}
  neq(field:string,value:unknown){this.rows=this.rows.filter((r)=>r[field]!==value);return this;}
  is(field:string,value:unknown){this.rows=this.rows.filter((r)=>r[field]===value);return this;}
  in(field:string,values:unknown[]){this.rows=this.rows.filter((r)=>values.includes(r[field]));return this;}
  ilike(field:string,pattern:string){const q=pattern.replaceAll("%","").toLowerCase();this.rows=this.rows.filter((r)=>String(r[field]??"").toLowerCase().includes(q));return this;}
  or(){return this;}
  gte(){return this;} lte(){return this;}
  order(field:string,options?:{ascending?:boolean}){this.rows.sort((a,b)=>String(a[field]??"").localeCompare(String(b[field]??""))*(options?.ascending===false?-1:1));return this;}
  limit(value:number){this.rows=this.rows.slice(0,value);return this;}
  range(from:number,to:number){this.rows=this.rows.slice(from,to+1);return this;}
  single(){this.singleRow=true;return this;}
  insert(payload:Row|Row[]){tables[this.table].push(...structuredClone(Array.isArray(payload)?payload:[payload]));return this;}
  update(payload:Row){this.rows=this.rows.map((r)=>Object.assign(r,payload));return this;}
  then(resolve:(value:{data:unknown;error:null;count:number|null})=>unknown){const result={data:this.countOnly?null:this.singleRow?(this.rows[0]??null):this.rows,error:null,count:this.countOnly?this.rows.length:null};return Promise.resolve(result).then(resolve);}
}

export function createLocalSupabaseClient(){return {from:(table:string)=>new LocalQuery(table),rpc:async(name:string)=>({data:name==="has_permission"?true:null,error:null}),auth:{getUser:async()=>({data:{user:{id:"u-owner",email:"owner@madar.demo"}},error:null}),signOut:async()=>({error:null})}} as never;}
