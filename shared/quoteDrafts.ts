export const DRAFT_CLIENT_PLACEHOLDER = "Draft — client pending";
export const DRAFT_TITLE_PLACEHOLDER = "Draft Quote — details pending";

export function getQuoteDraftIdentity(clientName: string, title: string) {
  return {
    clientName: clientName.trim() || DRAFT_CLIENT_PLACEHOLDER,
    title: title.trim() || DRAFT_TITLE_PLACEHOLDER,
  };
}

export function isDraftPlaceholderClient(clientName: string | null | undefined) {
  return clientName?.trim() === DRAFT_CLIENT_PLACEHOLDER;
}
