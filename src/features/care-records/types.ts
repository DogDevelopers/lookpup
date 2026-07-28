export interface CareRecordPayload {
  reservationId: string;
  type: string;
  serviceType?: string | null;
  title: string;
  statusText: string;
  content: string;
  fields: Record<string, string>;
  imageUrls: string[];
}
