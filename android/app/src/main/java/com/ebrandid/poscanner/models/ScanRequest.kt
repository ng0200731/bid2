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
    val message: String
)
