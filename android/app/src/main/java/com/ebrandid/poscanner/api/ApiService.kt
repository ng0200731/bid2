package com.ebrandid.poscanner.api

import com.ebrandid.poscanner.models.ScanRequest
import com.ebrandid.poscanner.models.ScanResponse
import com.ebrandid.poscanner.models.LastScanResponse
import com.ebrandid.poscanner.models.ProgressHistoryResponse
import com.ebrandid.poscanner.models.VersionCheckResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {
    @POST("api/progress/scan")
    suspend fun recordScan(@Body request: ScanRequest): Response<ScanResponse>

    @GET("api/progress/{poNumber}/last")
    suspend fun getLastScan(@Path("poNumber") poNumber: String): Response<LastScanResponse>

    @GET("api/progress/{poNumber}")
    suspend fun getProgressHistory(@Path("poNumber") poNumber: String): Response<ProgressHistoryResponse>

    @GET("api/version/check")
    suspend fun checkVersion(@Query("version") version: String): Response<VersionCheckResponse>
}
