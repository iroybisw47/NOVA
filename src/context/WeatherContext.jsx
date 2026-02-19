import { createContext, useContext, useState, useEffect } from 'react'

const WeatherContext = createContext()

export function WeatherProvider({ children }) {
  const [weather, setWeather] = useState(null)
  const [userLocation, setUserLocation] = useState('Seattle')

  const fetchWeatherForLocation = async (location) => {
    try {
      const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${import.meta.env.VITE_WEATHER_API_KEY}&units=imperial`)
      const data = await r.json()
      if (data.cod === 200) return { success: true, weather: data, location: data.name }
      return { success: false }
    } catch (e) { return { success: false } }
  }

  useEffect(() => {
    const getWeather = async () => {
      const result = await fetchWeatherForLocation(userLocation)
      if (result.success) setWeather(result.weather)
    }
    getWeather()
  }, [userLocation])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const r = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${import.meta.env.VITE_WEATHER_API_KEY}`)
          const data = await r.json()
          if (data[0]) setUserLocation(data[0].name)
        } catch (e) {}
      }, () => {})
    }
  }, [])

  return (
    <WeatherContext.Provider value={{ weather, userLocation, setUserLocation, fetchWeatherForLocation }}>
      {children}
    </WeatherContext.Provider>
  )
}

export function useWeather() {
  const ctx = useContext(WeatherContext)
  if (!ctx) throw new Error('useWeather must be used within WeatherProvider')
  return ctx
}
