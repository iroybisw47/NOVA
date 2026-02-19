import { useSettings } from '../../context/SettingsContext'
import './AIRulesSettings.css'

export default function AIRulesSettings() {
  const { newRule, setNewRule, behavioralRules, addBehavioralRule, removeBehavioralRule } = useSettings()

  const handleAdd = () => {
    if (newRule.trim()) {
      addBehavioralRule(newRule.trim())
      setNewRule('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div className="ai-rules">
      <div className="ai-rules__add">
        <h3 className="ai-rules__add-title">Add Rule</h3>
        <div className="ai-rules__add-row">
          <input
            type="text"
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Always remind me to take breaks"
            className="ai-rules__add-input"
          />
          <button onClick={handleAdd} className="ai-rules__add-btn">Add</button>
        </div>
      </div>

      <div className="ai-rules__list">
        <div className="ai-rules__list-header">
          <h3 className="ai-rules__list-title">Active Rules ({behavioralRules.length})</h3>
        </div>
        <div className="ai-rules__list-body">
          {behavioralRules.length > 0 ? (
            behavioralRules.map((rule, i) => (
              <div key={rule.id} className="ai-rules__rule">
                <span className="ai-rules__rule-number">{i + 1}</span>
                <p className="ai-rules__rule-text">{rule.rule}</p>
                <button onClick={() => removeBehavioralRule(rule.id)} className="ai-rules__rule-delete">×</button>
              </div>
            ))
          ) : (
            <p className="ai-rules__empty">No rules yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
