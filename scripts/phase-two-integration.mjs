import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";

const required=["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","CRM_TEST_USER_A_EMAIL","CRM_TEST_USER_A_PASSWORD","CRM_TEST_USER_B_EMAIL","CRM_TEST_USER_B_PASSWORD"];
for(const key of required)if(!process.env[key])throw new Error(`Missing ${key}. Use an isolated Supabase test project.`);
const make=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const a=make(),b=make();
const login=async(client,email,password)=>{const{data,error}=await client.auth.signInWithPassword({email,password});assert.ifError(error);return data.user.id};
const userA=await login(a,process.env.CRM_TEST_USER_A_EMAIL,process.env.CRM_TEST_USER_A_PASSWORD);await login(b,process.env.CRM_TEST_USER_B_EMAIL,process.env.CRM_TEST_USER_B_PASSWORD);
const{data:membership,error:membershipError}=await a.from("organization_members").select("organization_id").eq("user_id",userA).eq("status","active").single();assert.ifError(membershipError);
const{data:stages,error:stageError}=await a.from("lead_stages").select("id").eq("organization_id",membership.organization_id).eq("code","new").single();assert.ifError(stageError);
const marker=`integration-${Date.now()}@example.test`;
const{data:leadId,error:createError}=await a.rpc("create_lead",{payload:{customer_type:"individual",full_name:"Integration Test Lead",email:marker,stage_id:stages.id,priority:"medium"}});assert.ifError(createError);assert.ok(leadId);
const{data:foreignRead,error:foreignReadError}=await b.from("leads").select("id").eq("id",leadId);assert.ifError(foreignReadError);assert.equal(foreignRead.length,0,"RLS must hide tenant A lead from tenant B");
const{data:foreignUpdate,error:foreignUpdateError}=await b.from("leads").update({full_name:"IDOR"}).eq("id",leadId).select("id");assert.ifError(foreignUpdateError);assert.equal(foreignUpdate.length,0,"RLS must block tenant B update");
const{data:duplicateMatches,error:duplicateError}=await a.rpc("find_lead_duplicates",{candidate_email:marker,candidate_mobile:"",candidate_whatsapp:"",candidate_company:""});assert.ifError(duplicateError);assert.ok(duplicateMatches.some(x=>x.id===leadId));
const{data:converted,error:convertError}=await a.rpc("convert_lead",{target_lead:leadId});assert.ifError(convertError);assert.ok(converted.customer_id);
const{error:secondConvertError}=await a.rpc("convert_lead",{target_lead:leadId});assert.ok(secondConvertError,"A lead cannot be converted twice");
console.log(JSON.stringify({tenantIsolation:"passed",idor:"passed",duplicateDetection:"passed",singleConversion:"passed",leadId},null,2));
