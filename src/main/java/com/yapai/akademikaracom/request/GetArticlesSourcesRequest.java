package com.yapai.akademikaracom.request;

import com.yapai.akademikaracom.utils.SourceFormat;

public record GetArticlesSourcesRequest(String title, SourceFormat sourceFormat) {
}