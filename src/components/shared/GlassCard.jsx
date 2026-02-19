import './GlassCard.css'

export default function GlassCard({
  children,
  className = '',
  variant = 'default',
  hover = false,
  as: Tag = 'div',
  ...props
}) {
  const classes = [
    'glass-card',
    `glass-card--${variant}`,
    hover && 'glass-card--hover',
    className,
  ].filter(Boolean).join(' ')

  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>
  )
}
