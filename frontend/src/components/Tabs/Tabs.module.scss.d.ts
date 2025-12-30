export type Styles = {
  active: string;
  disabled: string;
  tab: string;
  tabList: string;
  tabPanel: string;
  tabPanels: string;
  tabs: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
