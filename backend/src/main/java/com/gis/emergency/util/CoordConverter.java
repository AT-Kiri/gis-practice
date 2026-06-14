package com.gis.emergency.util;

/**
 * 坐标转换工具 —— 将 MapboxGL 的 WGS84 经纬度转为 Changchun 平面投影坐标（米）。
 * <p>
 * RoadNet@Changchun 使用 PCS_NON_EARTH 平面坐标系（单位：米），
 * 无标准 EPSG 编码。通过线性插值在 WGS84 地理范围与平面坐标范围之间建立映射。
 */
public class CoordConverter {

    // Changchun 数据在 WGS84 下的地理范围
    private static final double LNG_MIN = 125.1;
    private static final double LNG_MAX = 125.5;
    private static final double LAT_MIN = 43.7;
    private static final double LAT_MAX = 44.0;

    // RoadNet@Changchun 数据在平面坐标系下的范围（单位：米，由数据集实际 bounds 确定）
    // 平面范围: x=[47, 8958], y=[-7669, -55]
    private static final double X_MIN = 47;
    private static final double X_MAX = 8958;
    private static final double Y_MIN = -7669;
    private static final double Y_MAX = -55;

    /**
     * 将 WGS84 经纬度转换为 Changchun 平面坐标。
     * @param lng 经度
     * @param lat 纬度
     * @return [x, y] 平面坐标（米）
     */
    public static double[] wgs84ToChangchun(double lng, double lat) {
        double x = (lng - LNG_MIN) / (LNG_MAX - LNG_MIN) * (X_MAX - X_MIN) + X_MIN;
        double y = (lat - LAT_MIN) / (LAT_MAX - LAT_MIN) * (Y_MAX - Y_MIN) + Y_MIN;
        return new double[]{x, y};
    }

    /**
     * 将 Changchun 平面坐标转回 WGS84 经纬度（用于将 iServer 返回的分析结果坐标还原）。
     * @param x 平面 X 坐标（米）
     * @param y 平面 Y 坐标（米）
     * @return [lng, lat] 经纬度
     */
    public static double[] changchunToWgs84(double x, double y) {
        double lng = (x - X_MIN) / (X_MAX - X_MIN) * (LNG_MAX - LNG_MIN) + LNG_MIN;
        double lat = (y - Y_MIN) / (Y_MAX - Y_MIN) * (LAT_MAX - LAT_MIN) + LAT_MIN;
        return new double[]{lng, lat};
    }

    /**
     * 批量转换坐标点。
     * @param points WGS84 坐标列表，每项为 [lng, lat]
     * @return 平面坐标列表，每项为 [x, y]
     */
    public static double[][] batchConvert(double[][] points) {
        double[][] result = new double[points.length][2];
        for (int i = 0; i < points.length; i++) {
            result[i] = wgs84ToChangchun(points[i][0], points[i][1]);
        }
        return result;
    }
}
