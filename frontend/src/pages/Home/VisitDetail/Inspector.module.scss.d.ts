export type Styles = {
  armCell: string;
  badge: string;
  cameraId: string;
  commandCode: string;
  commandLabel: string;
  commandSection: string;
  commentsLabel: string;
  commentsSection: string;
  commentsText: string;
  content: string;
  dataTable: string;
  emptyCell: string;
  exposureInfo: string;
  exposureTable: string;
  exptime: string;
  header: string;
  headerItem: string;
  headerLabel: string;
  headerValue: string;
  infoGrid: string;
  infoLabel: string;
  infoRow: string;
  infoValue: string;
  inspector: string;
  noteBody: string;
  noteItem: string;
  notesLabel: string;
  notesSection: string;
  noteUser: string;
  pagination: string;
  previewCell: string;
  previewContainer: string;
  previewInfo: string;
  scrollable: string;
  settings: string;
  settingsGroup: string;
  settingsLabel: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
