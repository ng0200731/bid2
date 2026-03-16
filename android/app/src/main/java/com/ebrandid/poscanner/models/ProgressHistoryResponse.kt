package com.ebrandid.poscanner.models

import com.google.gson.annotations.SerializedName

data class ProgressHistoryResponse(
    val progress: List<ProgressScan>
)

data class ProgressScan(
    val department: String,
    @SerializedName("scanned_at")
    val scannedAt: String,
    val notes: String?
)
