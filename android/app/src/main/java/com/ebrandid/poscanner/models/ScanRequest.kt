package com.ebrandid.poscanner.models

import com.google.gson.annotations.SerializedName

data class ScanRequest(
    @SerializedName("poNumber")
    val poNumber: String,

    @SerializedName("department")
    val department: String,

    @SerializedName("notes")
    val notes: String? = null
)

data class ScanResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("message")
    val message: String,

    @SerializedName("error")
    val error: String? = null,

    @SerializedName("lastDepartment")
    val lastDepartment: String? = null,

    @SerializedName("attemptedDepartment")
    val attemptedDepartment: String? = null,

    @SerializedName("nextExpected")
    val nextExpected: String? = null
)

data class LastScan(
    @SerializedName("id")
    val id: Int,

    @SerializedName("po_number")
    val poNumber: String,

    @SerializedName("department")
    val department: String,

    @SerializedName("scanned_at")
    val scannedAt: String,

    @SerializedName("notes")
    val notes: String?
)

data class LastScanResponse(
    @SerializedName("lastScan")
    val lastScan: LastScan?,

    @SerializedName("hasHistory")
    val hasHistory: Boolean
)

data class VersionCheckResponse(
    @SerializedName("currentVersion")
    val currentVersion: String,

    @SerializedName("latestVersion")
    val latestVersion: String,

    @SerializedName("updateRequired")
    val updateRequired: Boolean,

    @SerializedName("updateAvailable")
    val updateAvailable: Boolean
)
