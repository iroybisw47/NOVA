import './MainLayout.css'

export default function MainLayout({ children }) {
  return (
    <div className="main-layout">
      <div className="main-layout__blobs">
        <div className="main-layout__blob main-layout__blob--1" />
        <div className="main-layout__blob main-layout__blob--2" />
        <div className="main-layout__blob main-layout__blob--3" />
      </div>
      <div className="main-layout__content">
        {children}
      </div>
    </div>
  )
}
