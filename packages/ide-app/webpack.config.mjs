import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import webpack from 'webpack';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const rawBasePath = process.env.AGENT_WEBUI_BASE_PATH ?? '/webui';
const normalizedBasePath = rawBasePath === '/' ? '' : rawBasePath.replace(/\/$/, '');
const publicPath = normalizedBasePath ? `${normalizedBasePath}/` : '/';

/** @type {import('webpack').Configuration} */
const config = {
  mode: isProduction ? 'production' : 'development',
  target: 'web',
  entry: path.resolve(dirname, 'src/browser/main.tsx'),
  output: {
    path: path.resolve(dirname, 'dist/browser'),
    filename: isProduction ? 'assets/[name].[contenthash].js' : 'assets/[name].js',
    chunkFilename: isProduction ? 'assets/[name].[contenthash].js' : 'assets/[name].js',
    publicPath,
    clean: true,
  },
  devtool: isProduction ? false : 'eval-source-map',
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json', '.less'],
    fallback: {
      fs: false,
      net: false,
      tls: false,
      child_process: false,
      path: false,
      os: false,
      crypto: false,
      stream: false,
      buffer: false,
      util: false,
      url: false,
      assert: false,
      process: 'process/browser',
    },
  },
  module: {
    exprContextCritical: false,
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(dirname, 'tsconfig.browser.json'),
            transpileOnly: true,
            compilerOptions: {
              declaration: false,
              declarationMap: false,
            },
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.less$/,
        oneOf: [
          {
            test: /\.module\.less$/,
            use: [
              'style-loader',
              {
                loader: 'css-loader',
                options: {
                  esModule: false,
                  modules: {
                    localIdentName: '[local]___[hash:base64:5]',
                    exportLocalsConvention: 'as-is',
                  },
                },
              },
              {
                loader: 'less-loader',
                options: { lessOptions: { javascriptEnabled: true } },
              },
            ],
          },
          {
            use: [
              'style-loader',
              {
                loader: 'css-loader',
                options: {
                  esModule: false,
                },
              },
              {
                loader: 'less-loader',
                options: { lessOptions: { javascriptEnabled: true } },
              },
            ],
          },
        ],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|ttf|woff|woff2|eot)$/,
        type: 'asset/resource',
        generator: { filename: 'assets/[name].[contenthash][ext]' },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(dirname, 'src/browser/index.html'),
      filename: 'index.html',
      templateParameters: {
        agentWebuiBasePath: normalizedBasePath,
      },
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
      'process.env.DEVELOPMENT': JSON.stringify(!isProduction),
      'process.env.EXTENSION_WORKER_HOST': JSON.stringify(''),
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ],
  experiments: {
    asyncWebAssembly: true,
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
  performance: {
    hints: false,
  },
};

export default config;
