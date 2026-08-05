import { addInteraction } from "@/lib/crm-actions";
export function InteractionForm({
  targetType,
  targetId,
  returnTo,
}: {
  targetType: "lead" | "customer" | "contact";
  targetId: string;
  returnTo: string;
}) {
  return (
    <form action={addInteraction} className="interaction-form">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <select name="kind" aria-label="نوع التفاعل">
        <option value="note">ملاحظة</option>
        <option value="call">مكالمة</option>
        <option value="meeting">اجتماع</option>
        <option value="message">رسالة</option>
        <option value="email">بريد</option>
        <option value="follow_up">متابعة</option>
      </select>
      <textarea
        name="body"
        required
        placeholder="اكتب تفاصيل التفاعل"
        rows={3}
      />
      <input name="outcome" placeholder="النتيجة (اختياري)" />
      <label>
        المتابعة القادمة
        <input name="followUp" type="datetime-local" />
      </label>
      <button className="primary-button small">تسجيل التفاعل</button>
    </form>
  );
}
