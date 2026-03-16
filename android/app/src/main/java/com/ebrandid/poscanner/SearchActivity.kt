package com.ebrandid.poscanner

import android.content.Intent
import android.os.Bundle
import android.widget.ImageButton
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.ebrandid.poscanner.utils.Constants
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText

class SearchActivity : AppCompatActivity() {

    private lateinit var etPoNumber: TextInputEditText
    private lateinit var btnSearch: MaterialButton
    private lateinit var btnBack: ImageButton

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_search)

        etPoNumber = findViewById(R.id.etPoNumber)
        btnSearch = findViewById(R.id.btnSearch)
        btnBack = findViewById(R.id.btnBack)

        btnBack.setOnClickListener {
            finish()
        }

        btnSearch.setOnClickListener {
            val poNumber = etPoNumber.text.toString().trim()

            if (poNumber.isEmpty()) {
                Toast.makeText(this, "Please enter a PO number", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val intent = Intent(this, ProgressHistoryActivity::class.java).apply {
                putExtra(Constants.EXTRA_PO_NUMBER, poNumber)
            }
            startActivity(intent)
        }
    }
}
