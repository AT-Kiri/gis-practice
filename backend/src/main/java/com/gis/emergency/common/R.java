package com.gis.emergency.common;

/**
 * 统一响应体 —— 前后端接口约定格式 { code, message, data }
 * code=200 表示成功，非 200 表示业务异常
 */
public class R<T> {

    /** 状态码：200 成功，其他为错误 */
    private int code;
    /** 提示信息 */
    private String message;
    /** 返回数据泛型 */
    private T data;

    private R() {}

    /** 返回成功结果（带数据） */
    public static <T> R<T> ok(T data) {
        R<T> r = new R<>();
        r.code = 200;
        r.message = "success";
        r.data = data;
        return r;
    }

    /** 返回成功结果（无数据） */
    public static <T> R<T> ok() {
        return ok(null);
    }

    /** 返回业务错误（自定义状态码和消息） */
    public static <T> R<T> error(int code, String message) {
        R<T> r = new R<>();
        r.code = code;
        r.message = message;
        return r;
    }

    /** 返回业务错误（默认 500 状态码） */
    public static <T> R<T> error(String message) {
        return error(500, message);
    }

    // ---- Getter / Setter ----
    public int getCode() { return code; }
    public void setCode(int code) { this.code = code; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public T getData() { return data; }
    public void setData(T data) { this.data = data; }
}
