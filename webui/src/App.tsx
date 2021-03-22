import { Navigate, Route, Routes } from "solid-app-router"
import { Component, Show } from 'solid-js'
import { FlexColumn } from "./components/layout"
import { Devel } from "./pages/Devel"
import { Header } from "./pages/Header"
import { Home } from './pages/Home'
import { SqlSyntaxHelp } from "./pages/Home/SqlSyntaxHelp"
import { Login } from './pages/Login'
import { lazyNamedComponent } from "./utils/lazyNamedComponent"


const Designs2 = lazyNamedComponent(import('./pages/Designs'), m => m.Designs)


const App: Component = () => {
  return (
    <FlexColumn style={{ height: '100vh' }}>
      <Header />
      <Routes >
        <Route path="/" element={<Navigate href='/visits' />} />
        <Route path="/visits/sql-syntax-help" element={<SqlSyntaxHelp />} />
        <Route path="/visits/:visit_id?" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/designs/:design_id?" element={<Designs2 />} />
        <Show when={import.meta.env.DEV}>
          <Route path="/devel" element={<Devel />} />
        </Show>
        <Route path="/*" element={<Navigate href='/' />} />
      </Routes>
    </FlexColumn >
  )
}

export default App
