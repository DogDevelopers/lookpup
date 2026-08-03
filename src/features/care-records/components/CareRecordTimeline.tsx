import Image from "next/image";
import { ClipboardList } from "lucide-react";
import { z } from "zod";
import SectionCard from "@/components/common/SectionCard";
import { CARE_RECORD_TYPES } from "@/features/care-records/record-types";
import type { CareRecord } from "@/features/care-records/actions";

const fieldsSchema = z.record(z.string(), z.string());

const CONFIG_BY_TYPE = new Map(
  CARE_RECORD_TYPES.map((c) => [c.type as string, c]),
);

const dateTimeFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function visibleFields(record: CareRecord) {
  const parsed = fieldsSchema.safeParse(record.fields);
  if (!parsed.success) return [];

  const config = CONFIG_BY_TYPE.get(record.type);
  if (!config) return [];

  return config.fields
    .filter((f) => f.key !== "memo" && f.type !== "photo")
    .map((f) => ({ key: f.key, label: f.label, value: parsed.data[f.key] }))
    .filter((f) => f.value.trim().length > 0);
}

function CareRecordItem({
  record,
  last,
}: {
  record: CareRecord;
  last: boolean;
}) {
  const config = CONFIG_BY_TYPE.get(record.type);
  const fields = visibleFields(record);

  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-9 h-9 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-base leading-none">
          {config?.emoji ?? "🐾"}
        </div>
        {!last && <div className="w-px flex-1 bg-orange-100 my-1" />}
      </div>

      <div className={`flex-1 min-w-0 ${last ? "" : "pb-5"}`}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold text-stone-900">
            {record.title}
          </span>
          <span className="text-[11px] text-gray-500 shrink-0">
            {dateTimeFormat.format(new Date(record.created_at))}
          </span>
        </div>
        <span className="inline-block mt-1 text-[11px] font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
          {record.status_text}
        </span>

        {fields.length > 0 && (
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {fields.map((f) => (
              <div key={f.key} className="contents">
                <dt className="text-xs text-gray-500">{f.label}</dt>
                <dd className="text-xs text-stone-900">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {record.content.trim().length > 0 && (
          <p className="mt-3 text-sm text-stone-900 leading-6 whitespace-pre-wrap bg-orange-50/60 rounded-xl px-3 py-2">
            {record.content}
          </p>
        )}

        {record.image_urls.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {record.image_urls.map((url) => (
              <div
                key={url}
                className="relative aspect-square rounded-xl overflow-hidden bg-orange-50"
              >
                <Image
                  src={url}
                  alt={record.title}
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

export default function CareRecordTimeline({
  records,
}: {
  records: CareRecord[];
}) {
  return (
    <SectionCard className="px-6 py-5 gap-0">
      <div className="flex items-center gap-2 mb-5">
        <ClipboardList size={18} className="text-orange-500" />
        <h3 className="text-sm font-semibold text-stone-900">돌봄 기록</h3>
        {records.length > 0 && (
          <span className="text-xs text-gray-500">{records.length}건</span>
        )}
      </div>

      {records.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          아직 등록된 돌봄 기록이 없어요
        </p>
      ) : (
        <ol>
          {records.map((record, i) => (
            <CareRecordItem
              key={record.id}
              record={record}
              last={i === records.length - 1}
            />
          ))}
        </ol>
      )}
    </SectionCard>
  );
}
