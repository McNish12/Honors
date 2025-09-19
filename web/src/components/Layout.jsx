import { Outlet } from 'react-router-dom'
import UserMenu from './UserMenu.jsx'

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <header className="shell-header">
        <div className="shell-header__brand">
          <h1 className="shell-header__title">Own Ops CRM</h1>
        </div>
        <UserMenu />
      </header>
      <div className="app-shell__main">{children || <Outlet />}</div>
    </div>
  )
}
