package com.ebrandid.poscanner.api

import com.ebrandid.poscanner.models.ScanRequest
import com.ebrandid.poscanner.models.ScanResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface ApiService {
    @POST("api/progress/scan")
    suspend fun recordScan(@Body request: ScanRequest): Response<ScanResponse>
}
