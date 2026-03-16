package com.ebrandid.poscanner.models

data class ProgressHistoryItem(
    val department: String,
    val scannedAt: String?,
    val notes: String?,
    val isScanned: Boolean
)
