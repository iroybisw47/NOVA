import { useWeather } from '../../context/WeatherContext'
import './WeatherCard.css'

export default function WeatherCard() {
  const { weather } = useWeather()

  if (!weather) return null

  return (
    <div className="weather-card">
      <div>
        <p className="weather-card__location">{weather.name}</p>
        <p className="weather-card__temp">{Math.round(weather.main.temp)}°F</p>
        <p className="weather-card__desc">{weather.weather[0].description}</p>
      </div>
      <img
        src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
        alt=""
        className="weather-card__icon"
      />
    </div>
  )
}
