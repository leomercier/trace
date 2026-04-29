// Database types. Generate with:
//   bunx supabase gen types typescript --project-id <id> > lib/supabase/types.gen.ts
// For now we hand-roll the slice we use. Replace with generated types when available.

export type OrgRole = "owner" | "admin" | "editor" | "viewer";
export type FileType = "dwg" | "dxf" | "pdf" | "svg" | "png" | "jpg" | "other";
export type ShareScope = "project" | "page";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  created_by: string | null;
  created_at: string;
}

export interface OrganisationMember {
  organisation_id: string;
  user_id: string;
  role: OrgRole;
  invited_by: string | null;
  joined_at: string;
}

export interface OrganisationInvite {
  id: string;
  organisation_id: string;
  email: string;
  role: OrgRole;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  organisation_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
  source_storage_path: string | null;
  source_file_type: FileType | null;
  source_file_name: string | null;
  source_file_size: number | null;
  source_bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  thumbnail_path: string | null;
  scale_real_per_unit: number | null;
  scale_unit: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Measurement {
  id: string;
  page_id: string;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  label: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteStyle {
  bg?: string;
  color?: string;
  font?: string;
  size?: number;
  bold?: boolean;
  italic?: boolean;
}

export interface Note {
  id: string;
  page_id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: string;
  style: NoteStyle | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PageDrawing {
  id: string;
  page_id: string;
  storage_path: string;
  file_type: FileType | null;
  file_name: string | null;
  file_size: number | null;
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  visible: boolean;
  sort_order: number;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface Attachment {
  id: string;
  page_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  pinned_x: number | null;
  pinned_y: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface InventoryItem {
  id: string;
  organisation_id: string | null;
  source: "default" | "ai" | "manual";
  name: string;
  category: string | null;
  brand: string | null;
  price_text: string | null;
  width_mm: number;
  depth_mm: number;
  height_mm: number;
  svg_markup: string;
  thumbnail_url: string | null;
  source_url: string | null;
  query: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PlacedItem {
  id: string;
  page_id: string;
  inventory_item_id: string | null;
  name: string;
  brand: string | null;
  svg_markup: string;
  width_mm: number;
  depth_mm: number;
  height_mm: number;
  x: number;
  y: number;
  rotation: number;
  scale_w: number;
  scale_d: number;
  z_order: number;
  locked: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  page_id: string;
  parent_id: string | null;
  x: number;
  y: number;
  text: string;
  resolved: boolean;
  author_id: string | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicShare {
  id: string;
  scope: ShareScope;
  project_id: string | null;
  page_id: string | null;
  slug: string;
  password_hash: string | null;
  allow_comments: boolean;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
}
