const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const libraryName = require('./package').name;

module.exports = {
    entry: './src/index.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                loader: 'awesome-typescript-loader',
                query: {
                    declaration: false,
                }
            }
        ]
    },
    resolve: {
        extensions: [ '.tsx', '.ts', '.js' ]
    },
    devtool: 'source-map',
    plugins: [
        new UglifyJsPlugin({
            sourceMap: true,
            include: /\.min\.js$/,
        }),
    ],
    output: {
        path: path.resolve(__dirname, 'dist/_bundles'),
        filename: `${libraryName}.js`,
        libraryTarget: 'umd',
        library: libraryName,
        umdNamedDefine: true,
    },
};
