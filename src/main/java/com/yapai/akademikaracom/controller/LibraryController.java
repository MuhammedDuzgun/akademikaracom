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
import org.springframework.security.core.Authentication;
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
    public ResponseEntity<String> addAuthorToLibrary(Authentication authentication,
                                                     @RequestBody AddAuthorRequest request) {
        String response = libraryService.addAuthorToLibrary(authentication, request);
        return ResponseEntity.ok(response);
    }

    //get authors
    @GetMapping("/authors")
    public ResponseEntity<List<Author>> getAuthorsFromLibrary
            (Authentication authentication) {
        List<Author> authorsFromLibrary = libraryService.getAuthorsFromLibrary(authentication);
        return ResponseEntity.ok(authorsFromLibrary);
    }

    //delete author
    @DeleteMapping("/authors/{id}")
    public ResponseEntity<?> deleteAuthorFromLibrary(Authentication authentication,
                                                     @PathVariable("id") String openAlexId) {
        libraryService.deleteAuthorFromLibrary(authentication, openAlexId);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    //add work
    @PostMapping("/works")
    public ResponseEntity<String> addWorkToLibrary(Authentication authentication,
                                                   @RequestBody AddWorkRequest request) {
        String response = libraryService.addWorkToLibrary(authentication, request.openAlexId());
        return ResponseEntity.ok(response);
    }

    //get works
    @GetMapping("/works")
    public ResponseEntity<List<Work>> getWorksFromLibrary(Authentication authentication) {
        List<Work> worksFromLibrary = libraryService.getWorksFromLibrary(authentication);
        return ResponseEntity.ok(worksFromLibrary);
    }

    //delete work
    @DeleteMapping("/works/{id}")
    public ResponseEntity<?> deleteWorkFromLibrary(Authentication authentication,
                                                   @PathVariable("id") String openAlexId) {
        libraryService.deleteWorkFromLibrary(authentication, openAlexId);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    //add institution
    @PostMapping("/institutions")
    public ResponseEntity<String> addInstitutionToLibrary(Authentication authentication,
                                                          @RequestBody AddInstitutionRequest request) {
        String response = libraryService.addInstitutionToLibrary(authentication, request.openAlexId());
        return ResponseEntity.ok(response);
    }

    //get institutions
    @GetMapping("/institutions")
    public ResponseEntity<List<Institution>> getInstitutionsFromLibrary(Authentication authentication) {
        List<Institution> institutionsFromLibrary = libraryService.getInstitutionsFromLibrary(authentication);
        return ResponseEntity.ok(institutionsFromLibrary);
    }

    //delete institution
    @DeleteMapping("/institutions/{id}")
    public ResponseEntity<?> deleteInstitutionFromLibrary(Authentication authentication,
                                                          @PathVariable("id") String openAlexId) {
        libraryService.deleteInstitutionFromLibrary(authentication, openAlexId);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

}
