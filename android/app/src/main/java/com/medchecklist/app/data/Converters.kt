package com.medchecklist.app.data

import androidx.room.TypeConverter
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

class Converters {
    private val gson = Gson()

    @TypeConverter
    fun fromStringList(value: List<String>?): String {
        return gson.toJson(value ?: emptyList<String>())
    }

    @TypeConverter
    fun toStringList(value: String?): List<String> {
        if (value.isNullOrEmpty()) return emptyList()
        val type = object : TypeToken<List<String>>() {}.type
        return gson.fromJson(value, type) ?: emptyList()
    }

    @TypeConverter
    fun fromStrokePoints(value: List<StrokePoint>?): String {
        return gson.toJson(value ?: emptyList<StrokePoint>())
    }

    @TypeConverter
    fun toStrokePoints(value: String?): List<StrokePoint> {
        if (value.isNullOrEmpty()) return emptyList()
        val type = object : TypeToken<List<StrokePoint>>() {}.type
        return gson.fromJson(value, type) ?: emptyList()
    }

    @TypeConverter
    fun fromChecklists(value: List<EncounterChecklistInstance>?): String {
        return gson.toJson(value ?: emptyList<EncounterChecklistInstance>())
    }

    @TypeConverter
    fun toChecklists(value: String?): List<EncounterChecklistInstance> {
        if (value.isNullOrEmpty()) return emptyList()
        val type = object : TypeToken<List<EncounterChecklistInstance>>() {}.type
        return gson.fromJson(value, type) ?: emptyList()
    }

    @TypeConverter
    fun fromSections(value: List<ChecklistSection>?): String {
        return gson.toJson(value ?: emptyList<ChecklistSection>())
    }

    @TypeConverter
    fun toSections(value: String?): List<ChecklistSection> {
        if (value.isNullOrEmpty()) return emptyList()
        val type = object : TypeToken<List<ChecklistSection>>() {}.type
        return gson.fromJson(value, type) ?: emptyList()
    }

    @TypeConverter
    fun fromImages(value: List<MedicalImage>?): String {
        return gson.toJson(value ?: emptyList<MedicalImage>())
    }

    @TypeConverter
    fun toImages(value: String?): List<MedicalImage> {
        if (value.isNullOrEmpty()) return emptyList()
        val type = object : TypeToken<List<MedicalImage>>() {}.type
        return gson.fromJson(value, type) ?: emptyList()
    }

    @TypeConverter
    fun fromLinks(value: List<MedicalLink>?): String {
        return gson.toJson(value ?: emptyList<MedicalLink>())
    }

    @TypeConverter
    fun toLinks(value: String?): List<MedicalLink> {
        if (value.isNullOrEmpty()) return emptyList()
        val type = object : TypeToken<List<MedicalLink>>() {}.type
        return gson.fromJson(value, type) ?: emptyList()
    }
}
