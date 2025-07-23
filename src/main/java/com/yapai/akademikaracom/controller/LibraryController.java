package com.yapai.akademikaracom.controller;

import com.yapai.akademikaracom.entity.Author;
import com.yapai.akademikaracom.entity.Institution;
import com.yapai.akademikaracom.entity.Work;
import com.yapai.akademikaracom.request.AddAuthorRequest;
import com.yapai.akademikaracom.request.AddInstitutionRequest;
import com.yapai.akademikaracom.request.AddWorkRequest;
import com.yapai.akademikaracom.service.crud.LibraryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/libraries")
public class LibraryController {

    private final LibraryService libraryService;

    public LibraryController(LibraryService libraryService) {
        this.libraryService = libraryService;
    }

    //add author
    @PostMapping("/authors")
    public ResponseEntity<String> addAuthorToLibrary(@AuthenticationPrincipal OAuth2User oAuth2User,
                                                     @RequestBody AddAuthorRequest request) {
        String response = libraryService.addAuthorToLibrary(oAuth2User, request);
        return ResponseEntity.ok(response);
    }

    //get authors
    @GetMapping("/authors")
    public ResponseEntity<List<Author>> getAuthorsFromLibrary
            (@AuthenticationPrincipal OAuth2User oAuth2User) {
        List<Author> authorsFromLibrary = libraryService.getAuthorsFromLibrary(oAuth2User);
        return ResponseEntity.ok(authorsFromLibrary);
    }

    //delete author
    @DeleteMapping("/authors/{id}")
    public ResponseEntity<?> deleteAuthorFromLibrary(@AuthenticationPrincipal OAuth2User oAuth2User,
                                                     @PathVariable("id") String openAlexId) {
        libraryService.deleteAuthorFromLibrary(oAuth2User, openAlexId);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    //add work
    @PostMapping("/works")
    public ResponseEntity<String> addWorkToLibrary(@AuthenticationPrincipal OAuth2User oAuth2User,
                                                   @RequestBody AddWorkRequest request) {
        String response = libraryService.addWorkToLibrary(oAuth2User, request.openAlexId());
        return ResponseEntity.ok(response);
    }

    //get works
    @GetMapping("/works")
    public ResponseEntity<List<Work>> getWorksFromLibrary(@AuthenticationPrincipal OAuth2User oAuth2User) {
        List<Work> worksFromLibrary = libraryService.getWorksFromLibrary(oAuth2User);
        return ResponseEntity.ok(worksFromLibrary);
    }

    //delete work
    @DeleteMapping("/works/{id}")
    public ResponseEntity<?> deleteWorkFromLibrary(@AuthenticationPrincipal OAuth2User oAuth2User,
                                                   @PathVariable("id") String openAlexId) {
        libraryService.deleteWorkFromLibrary(oAuth2User, openAlexId);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    //add institution
    @PostMapping("/institutions")
    public ResponseEntity<String> addInstitutionToLibrary(@AuthenticationPrincipal OAuth2User oAuth2User,
                                                          @RequestBody AddInstitutionRequest request) {
        String response = libraryService.addInstitutionToLibrary(oAuth2User, request.openAlexId());
        return ResponseEntity.ok(response);
    }

    //get institutions
    @GetMapping("/institutions")
    public ResponseEntity<List<Institution>> getInstitutionsFromLibrary(@AuthenticationPrincipal OAuth2User oAuth2User) {
        List<Institution> institutionsFromLibrary = libraryService.getInstitutionsFromLibrary(oAuth2User);
        return ResponseEntity.ok(institutionsFromLibrary);
    }

    //delete institution
    @DeleteMapping("/institutions/{id}")
    public ResponseEntity<?> deleteInstitutionFromLibrary(@AuthenticationPrincipal OAuth2User oAuth2User,
                                                          @PathVariable("id") String openAlexId) {
        libraryService.deleteInstitutionFromLibrary(oAuth2User, openAlexId);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

}
