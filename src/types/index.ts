export interface Book {
  id: string;
  title: string;
  author: string | null;
  created_at: number;
}

export interface Highlight {
  id: string;
  book_id: string;
  image_uri: string;
  extracted_text: string;
  user_note: string | null;
  bounding_boxes: string;
  created_at: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrWord {
  id: string;
  text: string;
  frame: BoundingBox;
}

export type RootStackParamList = {
  Camera: undefined;
  Library: undefined;
  BookDetail: { bookId: string; bookTitle: string };
  Settings: undefined;
};
