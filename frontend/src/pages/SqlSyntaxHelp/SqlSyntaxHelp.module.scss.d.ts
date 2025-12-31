export type Styles = {
  examples: string;
  root: string;
  virtualTable: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
