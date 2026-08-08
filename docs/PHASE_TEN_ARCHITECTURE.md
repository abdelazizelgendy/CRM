# هندسة المرحلة العاشرة

`src/lib/production` يفصل types، calculations، state machines، seed، repository وprovider. Local Repository يعمل دون Supabase؛ Supabase Repository يرفض التشغيل بوضوح. الواجهة catch-all في `/dashboard/production/[[...segments]]`. الربط بالمخزون يتم عبر `postProductionCompletion` داخل Inventory Repository نفسه، فلا يوجد Stock Ledger موازٍ. الربط بالمشروع يعرض Production Orders حسب project/WBS/task/job دون تعديل تقدم المشروع تلقائيًا.
