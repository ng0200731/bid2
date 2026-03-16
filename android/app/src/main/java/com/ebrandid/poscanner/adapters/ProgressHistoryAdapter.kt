package com.ebrandid.poscanner.adapters

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.ebrandid.poscanner.R
import com.ebrandid.poscanner.models.ProgressHistoryItem
import com.ebrandid.poscanner.utils.DepartmentColors
import java.text.SimpleDateFormat
import java.util.*

class ProgressHistoryAdapter : ListAdapter<ProgressHistoryItem, ProgressHistoryAdapter.ViewHolder>(DiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_progress_history, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvDepartment: TextView = itemView.findViewById(R.id.tvDepartment)
        private val tvScannedAt: TextView = itemView.findViewById(R.id.tvScannedAt)
        private val tvNotes: TextView = itemView.findViewById(R.id.tvNotes)

        fun bind(item: ProgressHistoryItem) {
            tvDepartment.text = item.department

            if (item.isScanned) {
                // Set department color
                val color = DepartmentColors.getColor(item.department)
                val drawable = tvDepartment.background.mutate()
                if (drawable is android.graphics.drawable.GradientDrawable) {
                    drawable.setColor(Color.parseColor(color))
                }
                tvDepartment.setTextColor(Color.WHITE)

                // Format and display scanned time
                item.scannedAt?.let { timestamp ->
                    try {
                        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
                        inputFormat.timeZone = TimeZone.getTimeZone("UTC")
                        val date = inputFormat.parse(timestamp)

                        val outputFormat = SimpleDateFormat("MMM dd, yyyy HH:mm:ss", Locale.getDefault())
                        tvScannedAt.text = date?.let { outputFormat.format(it) } ?: "---"
                    } catch (e: Exception) {
                        tvScannedAt.text = timestamp
                    }
                }

                tvNotes.text = item.notes ?: "-"
            } else {
                // Not scanned yet
                val drawable = tvDepartment.background.mutate()
                if (drawable is android.graphics.drawable.GradientDrawable) {
                    drawable.setColor(Color.parseColor("#999999"))
                }
                tvDepartment.setTextColor(Color.WHITE)
                tvScannedAt.text = "---"
                tvNotes.text = "---"
            }
        }
    }

    private class DiffCallback : DiffUtil.ItemCallback<ProgressHistoryItem>() {
        override fun areItemsTheSame(oldItem: ProgressHistoryItem, newItem: ProgressHistoryItem): Boolean {
            return oldItem.department == newItem.department
        }

        override fun areContentsTheSame(oldItem: ProgressHistoryItem, newItem: ProgressHistoryItem): Boolean {
            return oldItem == newItem
        }
    }
}
