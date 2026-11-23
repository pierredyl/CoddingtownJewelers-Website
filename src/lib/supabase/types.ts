export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SupplierCode = "stuller" | "quality_gold" | (string & {});
export type SupplierApiType =
  | "rest_api"
  | "data_feed"
  | "sftp_feed"
  | "graphql"
  | "soap"
  | "manual";
export type SyncRunStatus = "running" | "succeeded" | "failed";

// ---------------------------------------------------------------------------
// Raw Postgres Table Row Types (matches 0001 + 0002 migrations)
// ---------------------------------------------------------------------------

export type SupplierRow = {
  id: number;
  code: SupplierCode;
  name: string;
  api_type: SupplierApiType;
  metadata: Json;
  created_at: string;
};

export type CategoryRow = {
  id: number;
  parent_id: number | null;
  slug: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type CatalogItemRow = {
  id: number;
  supplier_id: number;
  category_id: number | null;
  supplier_sku: string;
  supplier_item_id: string | null;
  group_code: string | null;
  title: string;
  short_description: string | null;
  description: string | null;
  metal_type: string | null;
  primary_stone: string | null;
  merchandising_area: string | null;
  attributes: Record<string, string | number | boolean | null>;
  raw_payload: Json | null;
  is_active: boolean;
  is_featured: boolean;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
  search_vector?: string | null;
};

export type CatalogImageRow = {
  id: number;
  item_id: number;
  thumbnail_url: string | null;
  full_url: string;
  zoom_url: string | null;
  angle: string | null;
  sort_order: number;
  is_primary: boolean;
};

export type SyncRunRow = {
  id: number;
  supplier_id: number;
  status: SyncRunStatus;
  items_upserted: number;
  items_deactivated: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
};

export type InquiryRow = {
  id: number;
  item_id: number | null;
  supplier_sku: string;
  customer_name: string;
  customer_contact: string;
  message: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Supabase Typed Database Schema
// ---------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      suppliers: {
        Row: SupplierRow;
        Insert: {
          code: string;
          name: string;
          api_type: SupplierApiType;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          code?: string;
          name?: string;
          api_type?: SupplierApiType;
          metadata?: Json;
        };
        Relationships: [];
      };
      categories: {
        Row: CategoryRow;
        Insert: {
          parent_id?: number | null;
          slug: string;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          parent_id?: number | null;
          slug?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      catalog_items: {
        Row: CatalogItemRow;
        Insert: {
          supplier_id: number;
          category_id?: number | null;
          supplier_sku: string;
          supplier_item_id?: string | null;
          group_code?: string | null;
          title: string;
          short_description?: string | null;
          description?: string | null;
          metal_type?: string | null;
          primary_stone?: string | null;
          merchandising_area?: string | null;
          attributes?: Record<string, string | number | boolean | null>;
          raw_payload?: Json | null;
          is_active?: boolean;
          is_featured?: boolean;
          last_synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          supplier_id?: number;
          category_id?: number | null;
          supplier_sku?: string;
          supplier_item_id?: string | null;
          group_code?: string | null;
          title?: string;
          short_description?: string | null;
          description?: string | null;
          metal_type?: string | null;
          primary_stone?: string | null;
          merchandising_area?: string | null;
          attributes?: Record<string, string | number | boolean | null>;
          raw_payload?: Json | null;
          is_active?: boolean;
          is_featured?: boolean;
          last_synced_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_items_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "catalog_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      catalog_images: {
        Row: CatalogImageRow;
        Insert: {
          item_id: number;
          thumbnail_url?: string | null;
          full_url: string;
          zoom_url?: string | null;
          angle?: string | null;
          sort_order?: number;
          is_primary?: boolean;
        };
        Update: {
          item_id?: number;
          thumbnail_url?: string | null;
          full_url?: string;
          zoom_url?: string | null;
          angle?: string | null;
          sort_order?: number;
          is_primary?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_images_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "catalog_items";
            referencedColumns: ["id"];
          },
        ];
      };
      sync_runs: {
        Row: SyncRunRow;
        Insert: {
          supplier_id: number;
          status: SyncRunStatus;
          items_upserted?: number;
          items_deactivated?: number;
          error_message?: string | null;
          started_at?: string;
          finished_at?: string | null;
        };
        Update: {
          status?: SyncRunStatus;
          items_upserted?: number;
          items_deactivated?: number;
          error_message?: string | null;
          finished_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sync_runs_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      inquiries: {
        Row: InquiryRow;
        Insert: {
          item_id?: number | null;
          supplier_sku: string;
          customer_name: string;
          customer_contact: string;
          message?: string | null;
          created_at?: string;
        };
        Update: {
          item_id?: number | null;
          supplier_sku?: string;
          customer_name?: string;
          customer_contact?: string;
          message?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inquiries_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "catalog_items";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// ---------------------------------------------------------------------------
// Storefront View Models (consumed by Frontend UI & queries.ts)
// ---------------------------------------------------------------------------

export interface CatalogImage {
  id: number;
  thumbnailUrl: string | null;
  fullUrl: string;
  zoomUrl: string | null;
  angle: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface CatalogVariant {
  id: number;
  supplierCode: SupplierCode;
  supplierName: string;
  supplierSku: string;
  supplierItemId: string | null;
  groupCode: string | null;
  title: string;
  shortDescription: string | null;
  description: string | null;
  metalType: string | null;
  primaryStone: string | null;
  merchandisingArea: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  attributes: Record<string, string | number | boolean | null>;
  isFeatured: boolean;
  images: CatalogImage[];
}

export interface CatalogItemGroup {
  /** Stable identifier for the card: group_code when present, otherwise supplierSku */
  groupKey: string;
  groupCode: string | null;
  title: string;
  shortDescription: string | null;
  description: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  supplierCode: SupplierCode;
  supplierName: string;
  isFeatured: boolean;
  /** Primary/initial variant displayed on the card */
  defaultVariant: CatalogVariant;
  /** All variants in this group (length >= 1) for in-place SKU switching */
  variants: CatalogVariant[];
}

export interface CategorySummary {
  id: number;
  parentId: number | null;
  slug: string;
  name: string;
  sortOrder: number;
}

export interface CatalogFilterParams {
  search?: string;
  categorySlug?: string;
  metalType?: string;
  primaryStone?: string;
  supplierCode?: SupplierCode;
  featuredOnly?: boolean;
  limit?: number;
}

export interface InquiryInput {
  itemId?: number | null;
  supplierSku: string;
  customerName: string;
  customerContact: string;
  message?: string | null;
}

export interface InquiryResult {
  ok: boolean;
  configured: boolean;
  error?: string;
}
