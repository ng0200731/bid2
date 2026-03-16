package com.ebrandid.poscanner.utils

object Constants {
    // API Configuration
    const val BASE_URL = "http://192.168.0.144:8768/"
    
    // Timeouts
    const val CONNECT_TIMEOUT = 30L
    const val READ_TIMEOUT = 30L
    const val WRITE_TIMEOUT = 30L
    
    // Intent extras
    const val EXTRA_PO_NUMBER = "po_number"
    
    // Departments (Sequence: 1→2→3→4→5→6→7→8)
    val DEPARTMENTS = arrayOf(
        "CS Team",
        "PMC",
        "Material",
        "Production",
        "Cut and Fold",
        "QC",
        "Shipment",
        "Account"
    )
}
