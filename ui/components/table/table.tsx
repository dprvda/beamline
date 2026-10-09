"use client";

import { createContext, useContext, type ComponentProps, type CSSProperties } from "react";
import { useComponentDefaults } from "@/runtime/appearance";
import { cn } from "@/lib/utils";
import type { TableDefaults, TableDensity } from "./defaults";
import styles from "./table.module.css";
export type { TableDefaults, TableDensity } from "./defaults";

export type TableClassNames = Partial<
  Record<"root" | "wrap" | "header" | "body" | "footer" | "row" | "head" | "cell" | "caption", string>
>;
const Parts = createContext<TableClassNames>({});
export interface TableProps extends ComponentProps<"table"> {
  /** Fixed row height: 32 / 40 / 48 px. Scoped density is the fallback. */
  density?: TableDensity;
  /** Explicit geometry overrides scoped tokens and density. */
  rowHeight?: number;
  stickyHeader?: boolean;
  classNames?: TableClassNames;
}
/** Native table for small datasets. Sorting, selection state and operations belong to the caller. */
export function Table({
  density: densityProp,
  rowHeight,
  stickyHeader,
  className,
  classNames = {},
  style,
  ...props
}: TableProps) {
  const defaults = useComponentDefaults<TableDefaults>("table", ["density"]);
  const explicitDensity = densityProp ?? defaults.density;
  const height = rowHeight;
  return (
    <Parts.Provider value={classNames}>
      <div data-slot="table-wrap" className={cn(styles.wrapper, classNames.wrap)}>
        <table
          data-slot="table"
          data-density={explicitDensity}
          data-sticky-header={stickyHeader || undefined}
          className={cn(styles.root, classNames.root, className)}
          style={
            { ...(height === undefined ? {} : { "--pui-table-row-height": `${height}px` }), ...style } as CSSProperties
          }
          {...props}
        />
      </div>
    </Parts.Provider>
  );
}
export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  const parts = useContext(Parts);
  return <thead data-slot="table-header" className={cn(styles.header, parts.header, className)} {...props} />;
}
export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  const parts = useContext(Parts);
  return <tbody data-slot="table-body" className={cn(styles.body, parts.body, className)} {...props} />;
}
export function TableFooter({ className, ...props }: ComponentProps<"tfoot">) {
  const parts = useContext(Parts);
  return <tfoot data-slot="table-footer" className={cn(styles.footer, parts.footer, className)} {...props} />;
}
export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  const parts = useContext(Parts);
  return <tr data-slot="table-row" className={cn(styles.row, parts.row, className)} {...props} />;
}
export interface TableCellProps extends ComponentProps<"td"> {
  numeric?: boolean;
  /** The caller's native button fills the cell and uses an inset keyboard focus ring. */
  interactive?: boolean;
  /** Pin the first column to the logical start edge. */
  sticky?: boolean;
}
export function TableHead({
  numeric,
  sticky,
  className,
  ...props
}: ComponentProps<"th"> & { numeric?: boolean; sticky?: boolean }) {
  const parts = useContext(Parts);
  return (
    <th
      data-slot="table-head"
      scope="col"
      data-numeric={numeric || undefined}
      data-sticky={sticky || undefined}
      className={cn(styles.head, parts.head, className)}
      {...props}
    />
  );
}
export function TableCell({ numeric, interactive, sticky, className, ...props }: TableCellProps) {
  const parts = useContext(Parts);
  return (
    <td
      data-slot="table-cell"
      data-numeric={numeric || undefined}
      data-interactive={interactive || undefined}
      data-sticky={sticky || undefined}
      className={cn(styles.cell, parts.cell, className)}
      {...props}
    />
  );
}
export function TableCaption({ className, ...props }: ComponentProps<"caption">) {
  const parts = useContext(Parts);
  return <caption data-slot="table-caption" className={cn(styles.caption, parts.caption, className)} {...props} />;
}
export default Table;
