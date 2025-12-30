export type Styles = {
  error: string;
  fieldError: string;
  form: string;
  loginContainer: string;
  submitContainer: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
