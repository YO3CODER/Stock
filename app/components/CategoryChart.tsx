import { ChartData } from '@/type'
import React, { useEffect, useState } from 'react'
import { getProductCategoryDistribution } from '../actions'
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Bar, BarChart, Cell } from 'recharts'
import EmptyState from './EmptyState'

const CategoryChart = ({ email }: { email: string }) => {
  const [data, setData] = useState<ChartData[]>([])

  const COLORS = [
    "#F97316", // Orange vif
    "#F59E0B", // Ambre
    "#EF4444", // Rouge
    "#EC489A", // Rose
    "#8B5CF6", // Violet
    "#3B82F6", // Bleu
    "#10B981", // Émeraude
    "#6B7280"  // Gris
  ]

  const fetchStats = async () => {
    try {
      if (email) {
        const data = await getProductCategoryDistribution(email)
        if (data) {
          setData(data)
        }
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (email)
      fetchStats()
  }, [email])

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
          <p className="font-bold text-gray-800">{label}</p>
          <p className="text-primary">
            <span className="font-semibold">{payload[0].value}</span> produits
          </p>
        </div>
      )
    }
    return null
  }

  if (data.length == 0) {
    return (
      <div className='w-full border-2 border-base-200 mt-4 p-4 rounded-3xl bg-white shadow-sm'>
        <h2 className='text-xl font-bold mb-4 flex items-center gap-2'>
           5 catégories avec le plus de produits
        </h2>
        <EmptyState
          message='Aucune catégorie pour le moment'
          IconComponent='Group'
        />
      </div>
    )
  }

  return (
    <div className='w-full border-2 border-base-200 mt-4 p-4 rounded-3xl bg-white shadow-sm hover:shadow-md transition-shadow'>
      <h2 className='text-xl font-bold mb-4 flex items-center gap-2'>
         5 catégories avec le plus de produits
        <span className="text-sm font-normal text-gray-500">
          ({data.reduce((sum, item) => sum + item.value, 0)} produits au total)
        </span>
      </h2>
      
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 60,
          }}
          barCategoryGap={20}
          barGap={4}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false}
            stroke="#E5E7EB"
          />
          <XAxis 
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={(props: any) => {
              const { x, y, payload } = props
              return (
                <g transform={`translate(${x},${y})`}>
                  <text
                    x={0}
                    y={0}
                    dy={16}
                    textAnchor="end"
                    fill="#793205"
                    fontSize={12}
                    fontWeight="500"
                    transform="rotate(-45)"
                  >
                    {payload.value}
                  </text>
                </g>
              )
            }}
            interval={0}
            height={80}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#6B7280" }}
            label={{ 
              value: "Nombre de produits", 
              angle: -90, 
              position: "insideLeft",
              style: { fill: "#793205", fontSize: 12, fontWeight: "bold" }
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#FEF3C7" }} />
          <Bar
            dataKey="value"
            radius={[8, 8, 0, 0]}
            animationDuration={1000}
            animationBegin={0}
            animationEasing="ease-out"
            label={{
              position: 'top',
              fill: '#793205',
              fontSize: 12,
              fontWeight: 'bold',
              formatter: (value: number) => value
            }}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
                fillOpacity={0.8}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e: any) => {
                  e.target.style.fillOpacity = 1
                }}
                onMouseLeave={(e: any) => {
                  e.target.style.fillOpacity = 0.8
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Légende */}
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {data.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-sm text-gray-600">{entry.name}</span>
            <span className="text-sm font-bold text-primary">{entry.value}</span>
          </div>
        ))}
      </div>
      
      {/* Statistiques supplémentaires */}
      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-xs text-gray-500">Catégorie la plus fournie</p>
          <p className="font-bold text-primary">
            {data[0]?.name} ({data[0]?.value} produits)
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Moyenne par catégorie</p>
          <p className="font-bold text-primary">
            {(data.reduce((sum, item) => sum + item.value, 0) / data.length).toFixed(1)} produits
          </p>
        </div>
      </div>
    </div>
  )
}

export default CategoryChart