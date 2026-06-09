const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://lkxyzeofgsrybjbulthj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreHl6ZW9mZ3NyeWJqYnVsdGhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU2MjU4NywiZXhwIjoyMDk2MTM4NTg3fQ.JF2QCIjL_R2vPn1V2Sb-WUPIITciZI3xNtTYCml1I0U";

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.rpc("get_constraint_definition", {});
  // If RPC doesn't exist, we can use a direct SQL query by running an SQL statement or checking errors
  // Wait, let's write a generic query using supabase.from() or checking if we can query from a custom RPC or system table.
  // Note: system tables cannot usually be queried via PostgREST unless there is a custom function.
  // Let's try inserting a dummy profile with plan = 'starter' and role = 'photographer'. If it fails with constraint error, we know.
  console.log("Testing update with plan = 'starter' on existing profile...");
  const targetUserId = "8a4ad0de-6773-4926-883c-5ce467b1995c";
  
  // 1. Fetch current plan so we can revert it
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", targetUserId)
    .single();
    
  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return;
  }
  
  const originalPlan = profile.plan;
  console.log(`Original plan is: ${originalPlan}`);
  
  // 2. Try updating to 'starter'
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ plan: "starter" })
    .eq("id", targetUserId);
    
  if (updateError) {
    console.log("Update to 'starter' failed. Error details:", updateError);
  } else {
    console.log("Update to 'starter' succeeded!");
    
    // Revert back
    const { error: revertError } = await supabase
      .from("profiles")
      .update({ plan: originalPlan })
      .eq("id", targetUserId);
      
    if (revertError) {
      console.error("Revert failed! Manual fix required for user:", targetUserId);
    } else {
      console.log("Successfully reverted back to original plan.");
    }
  }
}

main();
