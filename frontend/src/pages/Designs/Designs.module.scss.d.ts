export type Styles = {
  designsPage: string;
  mainArea: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
