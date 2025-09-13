"use client";

import { useEffect, useState } from "react";
import {
    LineChart,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer,
} from "recharts";
import styles from "./chart.module.css";

interface DataPacket {
    x: number;
    value: number;
}

const THRESHOLD = 5;
const MAX_X = 100;
const STEP = 0.3;

export default function CustomRealtimeChart() {
    const [data, setData] = useState<DataPacket[]>([]);

    useEffect(() => {
        const source = new EventSource("https://usb-keln.onrender.com/stream");

        source.onmessage = (event) => {
            const { counter, value } = JSON.parse(event.data);

            setData((prev) => {
                const newX = prev.length * STEP < MAX_X ? prev.length * STEP : MAX_X;
                let newData = [...prev, { x: newX, value }];

                // Сдвиг влево при достижении MAX_X
                if (newX >= MAX_X) {
                    newData = newData
                        .map((p) => ({ x: p.x - STEP, value: p.value }))
                        .filter((p) => p.x >= 0);
                }

                return newData;
            });
        };

        return () => {
            source.close();
        };
    }, []);

    const areaData = data.map((p) => ({
        x: p.x,
        value: p.value > THRESHOLD ? p.value : THRESHOLD,
    }));

    return (
        <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%">
                <LineChart data={data}>
                    <CartesianGrid stroke="#333" strokeDasharray="0" vertical={false} />
                    <XAxis
                        type="number"
                        dataKey="x"
                        domain={[0, MAX_X]}
                        ticks={Array.from({ length: MAX_X / 10 }, (_, idx) => (idx + 1) * 10)}
                    />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />

                    <ReferenceLine y={THRESHOLD} stroke="lime" strokeWidth={2} />

                    <Area
                        type="monotone"
                        data={areaData}
                        dataKey="value"
                        stroke="none"
                        fill="lime"
                        fillOpacity={0.3}
                        baseValue={THRESHOLD}
                        isAnimationActive={false}
                    />

                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#00ff00"
                        dot={false}
                        strokeWidth={2}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
