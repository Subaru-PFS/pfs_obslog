export type Styles = {
  header: string;
  home: string;
  leftPane: string;
  logoutButton: string;
  mainContent: string;
  placeholder: string;
  resizer: string;
  resizerActive: string;
  rightPane: string;
  userInfo: string;
  username: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
