import type Handsontable from "handsontable/base";
import Cell from "../components/Cell";
import daff from "daff/lib/core";

/**
 * Configurable labels for daff's diff markers.
 *
 * key   = the marker text daff emits (shown as-is when there is no entry here)
 * value = the label to display instead
 *
 * Delete an entry to fall back to daff's default marker.
 */
export const MARKER_LABELS: Record<string, string> = {
  "@:@": "源:改", // top-left corner cell (row-index : column-index marker)
  "@@": "表头", // header row of the diff
  "!": "结构", // column structure/schema row
  "+++": "++", // added rows or columns
  "---": "--", // removed rows or columns
  "→": "→", // modified cells in the action column
  "...": "...", // elided rows or columns
};

/** Categories daff assigns exclusively to its own decoration cells. */
const MARKER_CATEGORIES = new Set([
  "index",
  "spec",
  "header",
  "gap",
  "meta",
  "move",
]);

/**
 * daff wraps the diff in a decoration band: the left-most columns (row indexes and
 * action markers) and the top rows (column indexes, spec and header rows). Data only
 * starts after that band, so restricting relabeling to it guarantees a real
 * spreadsheet cell that happens to contain a marker string (e.g. "+++") is untouched.
 *
 * These sizes match the diff flags used in src/utils/Diff.ts
 * (`always_show_header` and `always_show_order` both enabled).
 */
const BAND_ROWS = 2;
const BAND_COLS = 2;


/**
 * daff 的 SimpleView.toDatum 是恒等函数，所以标记和真实数据在类型上完全一样（都是字符串）。
 * 这意味着如果无脑做全局文本替换，一张数据里本身写着 +++ 或 → 的表格会被误改。
 * 所以加了守卫 isMarkerCell()，
 * 只对 daff 的装饰带（左侧索引/动作列 + 顶部索引/结构/表头行）或 标记专属 category 的单元格生效，
 * 真实数据区一律不碰。
 */
function isMarkerCell(row: number, col: number, category: string) {
  return (
    row < BAND_ROWS || col < BAND_COLS || MARKER_CATEGORIES.has(category)
  );
}

export function renderDiff(
  instance: any,
  td: HTMLTableCellElement,
  row: number,
  col: number,
  prop: string | number,
  value: Handsontable.CellValue,
  cellProperties: Handsontable.CellProperties
) {
  var tt = new Cell(value, instance);
  var view = new daff.coopy.SimpleView();
  var cell = daff.coopy.DiffRender.renderCell(tt, view, col, row);
  var className = cell.category;
  var value2 = cell.pretty_value;

  if (isMarkerCell(row, col, className)) {
    var label = MARKER_LABELS[value2];
    if (label !== undefined) {
      value2 = label;
    }
  }

  if (className !== "") {
    td.className = className;
  }

  td.innerHTML = value2;
  return value2;
}
