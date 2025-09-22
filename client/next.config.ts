import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: 'export',           // статический экспорт
    trailingSlash: true,
    reactStrictMode: true,
    // 🔹 Важная часть: корректные пути для Electron
    basePath: '',
    assetPrefix: './',          // 🔹 все ассеты будут искаться относительно текущей папки
};

export default nextConfig;
