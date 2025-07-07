package com.yapai.akademikaracom.response;

import java.util.List;
import java.util.Map;

public class ArticleAnalyze {

    private String title;
    private List<String> authors;
    private List<String> institutions;
    private List<String> emails;
    private String journalName;
    private String publicationDate;
    private String doi;
    private List<String> keywords;
    private Map<String, String> sections;
    private String summary;
    private String strengths;
    private String weaknesses;
    private String contribution;
    private String missingPoints;
    private String methodology;
    private String researchQuestion;
    private String mainFindings;
    private String discussionSummary;
    private List<String> mostCitedSources;
    private int totalSourcesCount;
    private String sourceDiversityAndRecency;
    private String writingQuality;
    private String fluencyAndClarity;
    private String scientificTerminologySuitability;

    public ArticleAnalyze() {
    }

    public ArticleAnalyze(String title, List<String> authors, List<String> institutions, List<String> emails, String journalName, String publicationDate, String doi, List<String> keywords, Map<String, String> sections, String summary, String strengths, String weaknesses, String contribution, String missingPoints, String methodology, String researchQuestion, String mainFindings, String discussionSummary, List<String> mostCitedSources, int totalSourcesCount, String sourceDiversityAndRecency, String writingQuality, String fluencyAndClarity, String scientificTerminologySuitability) {
        this.title = title;
        this.authors = authors;
        this.institutions = institutions;
        this.emails = emails;
        this.journalName = journalName;
        this.publicationDate = publicationDate;
        this.doi = doi;
        this.keywords = keywords;
        this.sections = sections;
        this.summary = summary;
        this.strengths = strengths;
        this.weaknesses = weaknesses;
        this.contribution = contribution;
        this.missingPoints = missingPoints;
        this.methodology = methodology;
        this.researchQuestion = researchQuestion;
        this.mainFindings = mainFindings;
        this.discussionSummary = discussionSummary;
        this.mostCitedSources = mostCitedSources;
        this.totalSourcesCount = totalSourcesCount;
        this.sourceDiversityAndRecency = sourceDiversityAndRecency;
        this.writingQuality = writingQuality;
        this.fluencyAndClarity = fluencyAndClarity;
        this.scientificTerminologySuitability = scientificTerminologySuitability;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public List<String> getAuthors() {
        return authors;
    }

    public void setAuthors(List<String> authors) {
        this.authors = authors;
    }

    public List<String> getInstitutions() {
        return institutions;
    }

    public void setInstitutions(List<String> institutions) {
        this.institutions = institutions;
    }

    public List<String> getEmails() {
        return emails;
    }

    public void setEmails(List<String> emails) {
        this.emails = emails;
    }

    public String getJournalName() {
        return journalName;
    }

    public void setJournalName(String journalName) {
        this.journalName = journalName;
    }

    public String getPublicationDate() {
        return publicationDate;
    }

    public void setPublicationDate(String publicationDate) {
        this.publicationDate = publicationDate;
    }

    public String getDoi() {
        return doi;
    }

    public void setDoi(String doi) {
        this.doi = doi;
    }

    public List<String> getKeywords() {
        return keywords;
    }

    public void setKeywords(List<String> keywords) {
        this.keywords = keywords;
    }

    public Map<String, String> getSections() {
        return sections;
    }

    public void setSections(Map<String, String> sections) {
        this.sections = sections;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getStrengths() {
        return strengths;
    }

    public void setStrengths(String strengths) {
        this.strengths = strengths;
    }

    public String getWeaknesses() {
        return weaknesses;
    }

    public void setWeaknesses(String weaknesses) {
        this.weaknesses = weaknesses;
    }

    public String getContribution() {
        return contribution;
    }

    public void setContribution(String contribution) {
        this.contribution = contribution;
    }

    public String getMissingPoints() {
        return missingPoints;
    }

    public void setMissingPoints(String missingPoints) {
        this.missingPoints = missingPoints;
    }

    public String getMethodology() {
        return methodology;
    }

    public void setMethodology(String methodology) {
        this.methodology = methodology;
    }

    public String getResearchQuestion() {
        return researchQuestion;
    }

    public void setResearchQuestion(String researchQuestion) {
        this.researchQuestion = researchQuestion;
    }

    public String getMainFindings() {
        return mainFindings;
    }

    public void setMainFindings(String mainFindings) {
        this.mainFindings = mainFindings;
    }

    public String getDiscussionSummary() {
        return discussionSummary;
    }

    public void setDiscussionSummary(String discussionSummary) {
        this.discussionSummary = discussionSummary;
    }

    public List<String> getMostCitedSources() {
        return mostCitedSources;
    }

    public void setMostCitedSources(List<String> mostCitedSources) {
        this.mostCitedSources = mostCitedSources;
    }

    public int getTotalSourcesCount() {
        return totalSourcesCount;
    }

    public void setTotalSourcesCount(int totalSourcesCount) {
        this.totalSourcesCount = totalSourcesCount;
    }

    public String getSourceDiversityAndRecency() {
        return sourceDiversityAndRecency;
    }

    public void setSourceDiversityAndRecency(String sourceDiversityAndRecency) {
        this.sourceDiversityAndRecency = sourceDiversityAndRecency;
    }

    public String getWritingQuality() {
        return writingQuality;
    }

    public void setWritingQuality(String writingQuality) {
        this.writingQuality = writingQuality;
    }

    public String getFluencyAndClarity() {
        return fluencyAndClarity;
    }

    public void setFluencyAndClarity(String fluencyAndClarity) {
        this.fluencyAndClarity = fluencyAndClarity;
    }

    public String getScientificTerminologySuitability() {
        return scientificTerminologySuitability;
    }

    public void setScientificTerminologySuitability(String scientificTerminologySuitability) {
        this.scientificTerminologySuitability = scientificTerminologySuitability;
    }
}
