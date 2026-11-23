export type {
  CatalogFilterParams,
  CatalogImage,
  CatalogItemGroup,
  CatalogVariant,
  CategorySummary,
  InquiryInput,
  InquiryResult,
  SupplierCode,
} from "@/lib/supabase/types";

export interface CatalogFilterState {
  query: string;
  categorySlug: string;
  metalType: string;
  primaryStone: string;
  supplierCode: string;
}
