/* @refresh reload */
import 'material-icons/iconfont/material-icons.css'
import { hashIntegration, Router } from "solid-app-router"
import { render } from 'solid-js/web'
import App from './App'
import { ModalLoadingProvider } from "./components/Loading"
import './index.scss'


render(
  () => (
    <ModalLoadingProvider>
      <Router source={hashIntegration()}>
        <App />
      </Router>
    </ModalLoadingProvider>
  ),
  document.getElementById('root') as HTMLElement
)
