export type Color = string;
export type Path = {
    block: number,
    symbol?: number,
};
export type Range = {
    start: Path,
    end: Path,
};
export type AttrsRange = {
    start: number,
    end?: number,
    attrs: RichTextAttrs,
};
export type RichTextSelection = {
    text: string,
    range: Range,
};
export type RichTextAttrs = Partial<{
    color: Color,
    hoverColor: Color,
    background: Color,
    fontSize: number,
    fontFamily: string,
    dropCaps: boolean,
    italic: boolean,
    bold: boolean,
    letterSpacing: number,
    ref: string,
}>;
export type RichTextSimpleFragment = {
    frag?: undefined,
    text: string,
    attrs?: RichTextAttrs,
};
export type RichTextImageFragment = {
    frag: 'image',
    src: string,
    title?: string,
};
type ListItem = RichTextFragment[];
export type RichTextListFragment = {
    frag: 'list',
    kind: 'ordered' | 'unordered',
    items: ListItem[],
};
type TableCell = RichTextFragment[];
type TableRow = TableCell[];
export type RichTextTableFragment = {
    frag: 'table',
    rows: TableRow[],
};
export type RichTextFragment =
    | RichTextSimpleFragment
    | RichTextImageFragment
    | RichTextListFragment
    | RichTextTableFragment
    ;
export type RichTextBlock = {
    center?: boolean,
    indent?: boolean,
    margin?: number,
    fragments: RichTextFragment[],
};
