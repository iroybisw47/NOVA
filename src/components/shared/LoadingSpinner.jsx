import './LoadingSpinner.css'

export default function LoadingSpinner({ size = 'md', label = 'Loading...' }) {
  return (
    <div className={`loading-spinner loading-spinner--${size}`}>
      <div className="loading-spinner__ring" />
      {label && <span className="loading-spinner__label">{label}</span>}
    </div>
  )
}
